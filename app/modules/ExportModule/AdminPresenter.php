<?php

namespace App\ExportModule\Presenters;

use Nette;
use Nette\Application\UI\Form;

class AdminPresenter extends Nette\Application\UI\Presenter
{
	/**
	 * @var \MailManager
	 * @inject
	 */
	public $mailManager;

	public function renderDefault($hash = '')
	{
		if ($hash !== '53cr3d'){
			$this->error();
		}

		$this->template->users = $this->mailManager->adminGetCampUsers();
	}

}
