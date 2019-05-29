<?php

namespace App\FrontModule\Presenters;

class ProgramPresenter extends BasePresenter
{
	public function actionDefault()
	{
		$this->title = 'Program Nette Campu';
		$participants = $this->model->registrations->findLatest();
		$this->template->count = $participants->count();
	}

	public function renderDefault()
	{

	}

}
