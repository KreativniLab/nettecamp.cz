<?php declare(strict_types = 1);

namespace App\FrontModule\Presenters;

class LocationPresenter extends BasePresenter
{

    public function actionDefault(): void
    {
        $this->title = 'Lokace Nette Campu';
    }

    public function renderDefault(): void
    {
    }

}
