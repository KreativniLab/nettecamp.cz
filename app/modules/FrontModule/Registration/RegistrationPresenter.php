<?php

namespace App\FrontModule\Presenters;

use App\FrontModule\Components\RegistrationFormFactory;
use App\Model\RegistrationManager;

class RegistrationPresenter extends BasePresenter
{
	/** @var RegistrationManager @inject */
	public $registrationManager;

	/** @var RegistrationFormFactory @inject */
	public $registrationFormFactory;

	public $formSendSuccess = FALSE;


	public function renderDefault()
	{
		$this->template->count = $this->registrationManager->getCampUsersCount();
		$this->template->users = $this->registrationManager->getCampUsers();
	}


	public function renderSuccess()
	{
	}


	public function createComponentRegistrationForm()
	{
		$form = $this->registrationFormFactory->create();

		$form->onSave[] = function () {
			$this->postGet('Registration:success');
			$this->setView('success');
			$this->redrawControl('content');
		};

		return $form;
	}

}
