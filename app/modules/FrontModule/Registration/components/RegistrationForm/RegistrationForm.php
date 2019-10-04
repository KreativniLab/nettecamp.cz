<?php

declare(strict_types=1);

namespace App\FrontModule\Components;

use App\FrontModule\Mails\RegistrationAdminMail;
use App\FrontModule\Mails\RegistrationData;
use App\FrontModule\Mails\RegistrationMail;
use App\Model\Model;
use App\Model\Registration;
use Nette\Application\UI\Control;
use Nette\Application\UI\Form;
use Nette\Utils\ArrayHash;
use Ublaboo\Mailing\MailFactory;

/**
 * @method onSave(RegistrationForm $self, $registration)
 */
class RegistrationForm extends Control
{

	/** @var callable[] */
	public $onSave = [];

	/** @var ArrayHash */
	private $registration;

	/** @var MailFactory */
	private $mailFactory;

	/** @var bool */
	private $fullCamp;

	/** @var Model */
	private $model;


	public function __construct($fullCamp = false, Model $model, MailFactory $mailFactory)
	{
		$this->mailFactory = $mailFactory;
		$this->fullCamp = $fullCamp;
		$this->model = $model;
	}


	public function createComponentRegistrationForm()
	{
		$form = new Form();

		$form->addHidden('email');
		$form->addText('name', "jméno a příjmení:")->setRequired('Vyplň jméno a příjmení');
		$form->addText('liame', "email:")->setRequired('Vyplň email')->addRule(Form::EMAIL,
			'emailová adresa je špatně zadaná');
		$form->addText('phone', "telefon:")->setRequired('Vyplň telefon');

		$time = [
			'ctvrtek' => "už ve čtvrtek na uvítací párty a páteční přednášky",
			'patek' => 'až v pátek po práci :-(',
		];

		$form->addRadioList('arrival', 'přijedu:', $time);
		$form->addCheckbox('invoice', 'chci fakturu na firmu')
			 ->addCondition($form::EQUAL, true)
			 ->toggle('companyid-container');

		$company = $form->addText('companyid', 'IČO');
		$company->addConditionOn($form['invoice'], Form::EQUAL, true)
			 ->setRequired('Vyplňte IČO firmy');



		$form->addCheckbox('vegetarian', 'nejím maso');

		$form->addText('nickname', "nickname:");

		$shirts = [
			'S' => "S",
			'M' => "M",
			'L' => "L",
			'XL' => "XL",
			'2XL' => "2XL",
		];

//		$form->addRadioList('tshirt', 'tríčko:', $shirts)->setRequired('Zvol si velikos trička');
		$form->addHidden('tshirt', 'NULL');

		$levels = [
			'rookie' => "Rookie",
			'normal' => "Normal",
			'pro' => 'Pro',
			'allstar' => 'Allstar',
			'dgx' => 'DGX',
		];

		$form->addRadioList('skills', 'Nette skills:', $levels)
			 ->setRequired('Zvol svojí Nette dovednost');

		$form->addTextArea('presentation', "workshop/přednáška:")->setRequired('doplň o co se zajímáš');

		$form->addTextArea('note', 'Poznámka');


		$form->setDefaults([
			'arrival' => 'ctvrtek',
		]);

		$form->addSubmit('actionSend', 'Save');

		$form->onValidate[] = function ($form, $values) {
			if (!$values->email === '') {
				$form->addError('spam protection activated');
				return false;
			}
		};

		$form->onSuccess[] = function ($form, $values) {
			$this->processForm($values);
			$this->onSave($this, $this->registration);
		};

		return $form;
	}


	private function processForm($values)
	{
		$values->email = $values->liame;

        if ($values['vegetarian']){
            $values['vegetarian'] = 'yes';
        } else {
            $values['vegetarian'] = 'no';
        }
        if ($values['invoice']){
            $values['invoice'] = 'yes';
        } else {
            $values['invoice'] = 'no';
        }

		$participant = new Registration(2019, $values->name, $values->nickname, $values->email, $values->phone, $values->arrival, $values->invoice, $values->companyid, $values->vegetarian,
			$values->skills, $values->tshirt, $values->presentation, $values->note);

		if ($this->fullCamp) {
			$participant->setInWaitinglist();
		}

		$this->model->persistAndFlush($participant);


		$registrationData = new RegistrationData('2019', $values['name'], $values['nickname'], $values['email'], $values['phone'], $values['arrival'], $values['invoice'], $values['companyid'],
			$values['vegetarian'], $values['skills'], $values['tshirt'], $values['presentation'], $values['note']);

		$mail = $this->mailFactory->createByType(RegistrationMail::class, $registrationData);
		$mail->send();

		$mailAdmin = $this->mailFactory->createByType(RegistrationAdminMail::class, $registrationData);
		$mailAdmin->send();
	}


	public function render()
	{
		$this->template->render(__DIR__ . '/registrationForm.latte');
	}

}
