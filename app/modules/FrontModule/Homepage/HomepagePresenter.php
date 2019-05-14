<?php

namespace App\FrontModule\Presenters;

use App\Model\Model;

class HomepagePresenter extends BasePresenter
{
	/** @var Model @inject */
	public $model;


	public function renderDefault()
	{
//		$this->setView('closed');

		$this->model->registrations->findAll();
		$participants = $this->model->registrations->findLatest();

		$participantsArray = $participants->fetchAll();
		shuffle($participantsArray);

		$this->template->participants = $participantsArray;
		$this->template->count = $participants->count();
	}
}
