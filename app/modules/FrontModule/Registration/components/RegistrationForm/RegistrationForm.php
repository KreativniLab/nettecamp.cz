<?php

namespace App\FrontModule\Components;

use App\FrontModule\Mails\RegistrationAdminMail;
use App\FrontModule\Mails\RegistrationData;
use App\FrontModule\Mails\RegistrationMail;
use App\Model\RegistrationManager;
use Nette\Application\UI\Control;
use Nette\Application\UI\Form;
use Nette\ArrayHash;
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

	/** @var RegistrationManager */
	private $registrationManager;

	/**
	 * @var MailFactory
	 */
	private $mailFactory;

	/**
	 * @var bool
	 */
	private $fullCamp;


	public function __construct($fullCamp = FALSE, RegistrationManager $registrationManager, MailFactory $mailFactory)
	{
		$this->registrationManager = $registrationManager;
		$this->mailFactory = $mailFactory;
		$this->fullCamp = $fullCamp;
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

		$form->addTextArea('presentation', "workshop/přednáška:")->setRequired('doplň o co se zajímáš');

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

		$form->onValidate[] = function ($form, $values) {
			if (!$values->email === '') {
				$form->addError('spam protection activated');
				return FALSE;
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
		$template = $this->createTemplate();

		$this->registration = [
			'year' => '2019',
			'name' => $values['name'],
			'nickname' => $values['nickname'],
			'email' => $values['email'],
			'phone' => $values['phone'],
			'arrival' => $values['arrival'],
			'invoice' => $values['invoice'],
			'vegetarian' => $values['vegetarian'],
			'skills' => $values['skills'],
			'tshirt' => $values['tshirt'],
			'presentation' => $values['presentation'],
			'note' => $values['note'],
		];

		if ($this->fullCamp){
			$this->registration['status'] = 'waitinglist';
		}

		$this->registrationManager->add($this->registration);


		$registrationData = new RegistrationData('2019', $values['name'], $values['nickname'], $values['email'], $values['phone'], $values['arrival'], $values['invoice'], $values['vegetarian'], $values['skills'], $values['tshirt'], $values['presentation'], $values['note']);

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
