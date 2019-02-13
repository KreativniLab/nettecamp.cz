<?php

namespace App\FrontModule\Presenters;

use App\Model\RegistrationManager;

class HomepagePresenter extends BasePresenter
{
	/** @var RegistrationManager @inject */
	public $registrationManager;


	public function renderDefault()
	{
		$this->setView('closed');
//		$this->template->count = $this->registrationManager->getCampUsersCount();
//		$this->template->users = $this->registrationManager->getCampUsers();
	}
}
