<?php declare(strict_types = 1);

namespace App\FrontModule\Components;

use App\Model\Model;
use App\Model\Registration;
use Contributte\Mailing\IMailBuilderFactory;
use Nette\Application\UI\Control;
use Nette\Application\UI\Form;
use Nette\Utils\ArrayHash;

/**
 * @method onSave(RegistrationForm $self, $registration)
 */
class RegistrationForm extends Control
{

    /** @var callable[] */
    public $onSave = [];

    /** @var ArrayHash */
    private $registration;

    /** @var IMailBuilderFactory */
    private $mailBuilderFactory;

    /** @var bool */
    private $fullCamp;

    /** @var Model */
    private $model;

    public function __construct(bool $fullCamp, Model $model, IMailBuilderFactory $mailBuilderFactory)
    {
        $this->fullCamp = $fullCamp;
        $this->model = $model;
        $this->mailBuilderFactory = $mailBuilderFactory;
    }


    public function createComponentRegistrationForm(): Form
    {
        $form = new Form();

        $form->addText('name', 'jméno a příjmení:')
            ->setRequired('Vyplň jméno a příjmení')
            ->addRule(Form::PATTERN_ICASE, 'Odděl jméno a příjmení mezerou', '.*? .*');

        $form->addText('email', 'email:')->setRequired('Vyplň email')->addRule(
            Form::EMAIL,
            'emailová adresa je špatně zadaná'
        );
        $form->addText('phone', 'telefon:')->setRequired('Vyplň telefon')->setDefaultValue('+420');

        $time = [
            'ctvrtek' => 'už ve čtvrtek na uvítací párty a páteční přednášky',
            'patek' => 'až v pátek po práci :-(',
        ];

        $form->addRadioList('arrival', 'přijedu:', $time);
        $invoice = $form->addCheckbox('invoice', 'chci fakturu na firmu');
        $invoice
            ->addCondition($form::EQUAL, true)
            ->toggle('companyid-container');

        $company = $form->addText('companyId', 'IČO');
        $company->addConditionOn($invoice, Form::EQUAL, true)
            ->setRequired('Vyplňte IČO firmy');

        $form->addCheckbox('vegetarian', 'nejím maso');

        $form->addText('nickname', 'nickname:');

        $shirts = [
            'S' => 'S',
            'M' => 'M',
            'L' => 'L',
            'XL' => 'XL',
            '2XL' => '2XL',
        ];

        // $form->addRadioList('tshirt', 'tríčko:', $shirts)->setRequired('Zvol si velikos trička');
     $form->addHidden('tshirt', 'NULL');

        $levels = [
            'rookie' => 'Rookie',
            'normal' => 'Normal',
            'pro' => 'Pro',
            'allstar' => 'Allstar',
            'dgx' => 'DGX',
        ];

        $form->addRadioList('skills', 'Nette skills:', $levels)
            ->setRequired('Zvol svojí Nette dovednost');

        $form->addTextArea('presentation', 'workshop/přednáška:')->setRequired('doplň o co se zajímáš');

        $form->addTextArea('note', 'Poznámka');

        $form->setDefaults([
            'arrival' => 'ctvrtek',
        ]);

        $form->addSubmit('actionSend', 'Save');

        $form->onSuccess[] = function () use ($form): void {
            $values = $form->getValues();
            $this->processForm($values);
            $this->onSave($this, $this->registration);
        };

        $form->onError[] = function (): void {
            if ($this->getPresenter()->isAjax()) {
                $this->redrawControl('registrationFormSnippet');
            }
        };

        return $form;
    }


    private function processForm(ArrayHash $values): void
    {
        $year = (int) date('Y');

        $values['vegetarian'] = $values['vegetarian'] ? 'yes' : 'no';

        $values['invoice'] = $values['invoice'] ? 'yes' : 'no';

        $participant = new Registration($year, $values->name, $values->nickname, $values->email, $values->phone, $values->arrival, $values->invoice, $values->companyId, $values->vegetarian, $values->skills, $values->tshirt, $values->presentation, $values->note);

        if ($this->fullCamp) {
            $participant->setInWaitinglist();
        }

        $this->model->persistAndFlush($participant);

        // mails
        // Admin email
        $mail = $this->mailBuilderFactory->create();

        $mail->setFrom($participant->email, $participant->name);
        $mail->setSubject('Nette Camp Registrace: ' . $participant->name);
        $mail->addTo('petra@kreativnilaborator.cz');
        $mail->addCc('honza@kreativnilaborator.cz');

        // Template
        $mail->setTemplateFile(__DIR__ . '/mails/registrationAdmin.latte');
        $mail->setParameters((array) $values);

        // Sending
        $mail->send();

        // Customer email
        $mailCustomer = $this->mailBuilderFactory->create();

        $mailCustomer->setFrom('hello@nettecamp.cz');
        $mailCustomer->setSubject('Registrace na Nette Camp ' . $participant->year);
        $mailCustomer->addTo($participant->email, $participant->name);

        // Template
        $mailCustomer->setTemplateFile(__DIR__ . '/mails/registration.latte');
        $mailCustomer->setParameters((array) $values);
        $mailCustomer->setParameters(['year' => $year]);

        // Sending
        $mailCustomer->send();
    }


    public function render(): void
    {
        $this->template->render(__DIR__ . '/registrationForm.latte');
    }

}
