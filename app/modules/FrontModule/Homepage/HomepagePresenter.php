<?php

namespace App\FrontModule\Presenters;

use Nittro;

class HomepagePresenter extends Nittro\Bridges\NittroUI\Presenter
{

	/**
	 * @var \MailManager
	 * @inject
	 */
	public $mailManager;

	public function renderDefault()
	{
		$this->template->count = $this->mailManager->getCampUsersCount();
		$this->template->users = $this->mailManager->getCampUsers();
	}
}
