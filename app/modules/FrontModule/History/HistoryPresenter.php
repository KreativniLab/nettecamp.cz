<?php

namespace App\FrontModule\Presenters;

use Nextras\Orm\Collection\ICollection;

class HistoryPresenter extends BasePresenter
{
	public function actionDefault()
	{
		$this->title = 'Historie Nette Campu';
		$this->template->history = $this->model->history->findAll()->orderBy('year', ICollection::DESC);
	}

}
