<?php declare(strict_types = 1);

namespace App\FrontModule\Presenters;

use Nextras\Orm\Collection\ICollection;

class HistoryPresenter extends BasePresenter
{

    public function actionDefault(): void
    {
        $this->title = 'Historie Nette Campu';
        $this->template->history = $this->model->history->findAll()->orderBy('year', ICollection::DESC);
    }

}
