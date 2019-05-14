<?php

namespace App\FrontModule\Presenters;

class HomepagePresenter extends BasePresenter
{
	public function renderDefault()
	{
		$participants = $this->model->registrations->findLatest();
		$this->template->count = $participants->count();
//		$this->setView('closed');
	}

}
