<?php

namespace App\Presenters;

use Nette;
use Nette\Application\UI\Form;

class HomepagePresenter extends Nette\Application\UI\Presenter
{
//	use \IPub\Gravatar\TGravatar;

	/**
	 * @var \MailManager
	 * @inject
	 */
	public $mailManager;

	public $formSendSuccess = FALSE;


	public function renderDefault($sended = FALSE)
	{
		if ($sended) {
			$this->formSendSuccess = TRUE;
		}

		$this->template->formSend = $this->formSendSuccess;

		$this->template->count = $this->mailManager->getCampUsersCount();
		$this->template->users = $this->mailManager->getCampUsers();
	}


	public function createComponentRegistrationForm()
	{
		$form = new Form();

		$form->addHidden('email');
		$form->addText('name', "Jméno:")->setRequired('Vyplň jméno');
		$form->addText('liame', "Email:")->setRequired('Vyplň email')->addRule(Form::EMAIL, 'Emailová adresa je špatně zadaná');
		$form->addText('phone', "Telefon:")->setRequired('Vyplň telefon');

		$time = array(
			'ctvrtek' => "přijedu ve čtvrtek",
			'patek' => 'přijedu v pátek',
		);

		$form->addSelect('from', 'Varianta:', $time);
		$form->addSelect('invoice', 'Faktura:', ['no'=>'fakturu neřeším', 'yes'=>'fakturu chci na firmu (viz poznámka)']);
		$form->addSelect('vege', 'Vegetarián:', ['no'=>'sním všechno', 'yes'=>'nejím maso']);

		$form->addText('nickname', "Přezdívka:");

		$levels = array(
			'rookie' => "Rookie",
			'normal' => "Normal",
			'pro' => 'Pro',
			'allstar' => 'Allstar',
		);

		$form->addSelect('level', 'Schopnosti:', $levels)->setPrompt('Nette skills?')->setRequired('Zvol svojí Nette dovednost');

		$shirts = array(
			'S' => "S",
			'M' => "M",
			'L' => "L",
			'XL' => "XL",
			'2XL' => "2XL",
		);

		$form->addSelect('tshirt', 'Tríčko:', $shirts)->setPrompt('velikost trička?')->setRequired('Zvol velikos trička');

		$form->addTextArea('note', 'Poznámka');

		$form->addSubmit('actionSend', 'Save');

		$form->onSuccess[] = array($this, 'registrationFormSubmitted');

		return $form;
	}


	public function registrationFormSubmitted(Form $form, $values)
	{
		if ($values->email == '') {

			$values->email = $values->liame;

			$template = $this->createTemplate();

			$status = $this->mailManager->sendOrderEmail($values, 'cs', $template);

			if ($status) {
				$this->formSendSuccess = TRUE;

				if ($this->isAjax()) {
					$this->redrawControl('order');
				} else {
					$this->redirect('this', array('sended' => TRUE));
				}
			} else {
				$this->flashMessage('Stala se tu chyba', 'error');
			}
		} else {
			$this->flashMessage('Stala se tu chyba', 'error');

		}
	}

}
