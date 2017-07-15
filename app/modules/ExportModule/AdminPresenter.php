<?php

namespace App\ExportModule\Presenters;

use App\Model\RegistrationManager;
use Nette;

class AdminPresenter extends Nette\Application\UI\Presenter
{
	/** @var RegistrationManager @inject */
	public $registrationManager;

	public function renderDefault($hash = '')
	{
		if ($hash !== '53cr3d'){
			$this->error();
		}

		$this->template->users = $this->registrationManager->adminGetCampUsers();
	}

}
