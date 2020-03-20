<?php declare(strict_types = 1);

namespace App\FrontModule\Presenters;

class TeamPresenter extends BasePresenter
{

    public function actionDefault(): void
    {
        $this->title = 'Tým Nette Campu';
    }

    public function renderDefault(): void
    {
    }

}
