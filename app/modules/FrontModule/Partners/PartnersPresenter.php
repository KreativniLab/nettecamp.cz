<?php declare(strict_types = 1);

namespace App\FrontModule\Presenters;

class PartnersPresenter extends BasePresenter
{

    public function actionDefault(): void
    {
        $this->title = 'Chcete se stát partnerem Nette Campu?';
    }

    public function renderDefault(): void
    {
    }

}
