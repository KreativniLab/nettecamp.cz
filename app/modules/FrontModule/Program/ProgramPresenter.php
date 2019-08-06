<?php

namespace App\FrontModule\Presenters;

class ProgramPresenter extends BasePresenter
{
	public function actionDefault()
	{
		$this->title = 'Program Nette Campu';
		$participants = $this->model->registrations->findLatest();
		$this->template->count = $participants->count();

		$this->template->metaOgImage = 'nette-camp-og-program.jpg';

        $programs = $this->model->programs->findAll()->fetchAll();
        shuffle($programs);
        $this->template->programs = $programs;
	}

	public function renderDefault()
	{

	}

}
