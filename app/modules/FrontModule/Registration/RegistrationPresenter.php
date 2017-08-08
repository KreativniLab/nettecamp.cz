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

	public $campUsersCount = 0;


	public function actionDefault()
	{
		$this->campUsersCount = $this->registrationManager->getCampUsersCount();
		$this->title = 'Registrace na Nette Camp';
	}


	public function renderDefault()
	{
		$this->template->count = $this->campUsersCount;
		$this->template->users = $this->registrationManager->getCampUsers();
	}


	public function actionSuccess()
	{
		$this->title = 'Registrován';
	}


	public function actionWaitinglist()
	{
		$this->title = 'Zařazen na čekačku';
	}

	public function createComponentRegistrationForm()
	{
		$fullCamp = FALSE;
		if ($this->campCapacity <= $this->campUsersCount){
			$fullCamp = TRUE;
		}

		$form = $this->registrationFormFactory->create($fullCamp);

		$form->onSave[] = function () use ($fullCamp) {
			if ($fullCamp){
				$this->postGet('Registration:waitinglist');
				$this->setView('waitinglist');

			} else {
				$this->postGet('Registration:success');
				$this->setView('success');
			}
			$this->redrawControl('content');
		};

		return $form;
	}

}
