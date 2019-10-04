<?php

declare(strict_types=1);

namespace App\FrontModule\Presenters;

use App\FrontModule\Components\RegistrationFormFactory;
use App\Model\Model;

class RegistrationPresenter extends BasePresenter
{
	/** @var Model @inject */
	public $model;

	/** @var RegistrationFormFactory @inject */
	public $registrationFormFactory;

	public $formSendSuccess = FALSE;

	public $campUsersCount = 0;


	public function actionDefault()
	{
		$participants = $this->model->registrations->findLatest();
		$participantsArray = $participants->fetchAll();

		$this->campUsersCount = $participants->count();
		$this->template->count = $this->campUsersCount;

		shuffle($participantsArray);

		$this->template->participants = $participantsArray;
		$this->title = 'Registrace na Nette Camp';
	}

	public function actionSuccess()
	{
		$this->title = 'Registrován';
	}


	public function actionWaitinglist()
	{
		$this->title = 'Zařazen do fronty';
	}


	public function createComponentRegistrationForm()
	{
		$fullCamp = FALSE;
		if ($this->campCapacity <= $this->campUsersCount) {
			$fullCamp = TRUE;
		}

		$form = $this->registrationFormFactory->create($fullCamp);

		$form->onSave[] = function () use ($fullCamp) {
			if ($fullCamp) {
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
