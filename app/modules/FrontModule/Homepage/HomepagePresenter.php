<?php

namespace App\FrontModule\Presenters;

use App\Model\RegistrationManager;
use Nittro;

class HomepagePresenter extends Nittro\Bridges\NittroUI\Presenter
{
	/** @var RegistrationManager @inject */
	public $registrationManager;


	public function renderDefault()
	{
		$this->template->count = $this->registrationManager->getCampUsersCount();
		$this->template->users = $this->registrationManager->getCampUsers();
	}
}
