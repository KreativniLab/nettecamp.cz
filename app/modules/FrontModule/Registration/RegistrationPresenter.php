<?php

namespace App\FrontModule\Presenters;

use App\Model\RegistrationManager;
use Nittro;
use Nette\Application\UI\Form;

class RegistrationPresenter extends Nittro\Bridges\NittroUI\Presenter
{

	/** @var \MailManager @inject */
	public $mailManager;

	/** @var RegistrationManager @inject */
	public $registrationManager;

	public $formSendSuccess = FALSE;


	public function renderDefault($sended = FALSE)
	{
		if ($sended) {
			$this->formSendSuccess = TRUE;
		}

		$this->template->formSend = $this->formSendSuccess;

		$this->template->count = $this->registrationManager->getCampUsersCount();
		$this->template->users = $this->registrationManager->getCampUsers();
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
			'ctvrtek' => "čtvrtek",
			'patek' => 'pátek',
		];

		$form->addSelect('arrival', 'přijedu ve:', $time);
		$form->addSelect('invoice', 'fakturu:',
			['no' => 'neřeším', 'yes' => 'chci na firmu']);
		$form->addSelect('vegetarian', 'strava:', ['no' => 'sním všechno', 'yes' => 'nejím maso']);

		$form->addText('nickname', "nickname:");

		$levels = [
			'rookie' => "Rookie",
			'normal' => "Normal",
			'pro' => 'Pro',
			'allstar' => 'Allstar',
		];

		$form->addSelect('skills', 'Nette skills:',$levels)
			 ->setPrompt('?')
			 ->setRequired('Zvol svojí Nette dovednost');

		$shirts = [
			'S' => "S",
			'M' => "M",
			'L' => "L",
			'XL' => "XL",
			'2XL' => "2XL",
		];

		$form->addSelect('tshirt', 'tríčko:',
			$shirts)->setPrompt('velikost ?')->setRequired('Zvol velikos trička');

		$note = $form->addTextArea('note', 'Poznámka');
		$note->addConditionOn($form['invoice'], Form::EQUAL, 'yes')
			 ->setRequired('Doplňte do poznámky IČ firmy');

		$form->addSubmit('actionSend', 'Save');

		$form->onSuccess[] = [$this, 'registrationFormSubmitted'];

		return $form;
	}


	public function registrationFormSubmitted(Form $form, $values)
	{
		if ($values->email == '') {

			$values->email = $values->liame;

			$template = $this->createTemplate();

			$data = [
				'year' => '2017',
				'name' => $values['name'],
				'nickname' => $values['nickname'],
				'email' => $values['email'],
				'phone' => $values['phone'],
				'arrival' => $values['arrival'],
				'invoice' => $values['invoice'],
				'vegetarian' => $values['vegetarian'],
				'skills' => $values['skills'],
				'tshirt' => $values['tshirt'],
				'note' => $values['note'],
				];

			$this->registrationManager->add($data);
			$status = $this->mailManager->sendOrderEmail($values, 'cs', $template);

			if ($status) {
				$this->formSendSuccess = TRUE;

				if ($this->isAjax()) {
					$this->redrawControl('order');
				} else {
					$this->redirect('this', ['sended' => TRUE]);
				}
			} else {
				$this->flashMessage('Stala se tu chyba', 'error');
			}
		} else {
			$this->flashMessage('Stala se tu chyba', 'error');

		}
	}

}
