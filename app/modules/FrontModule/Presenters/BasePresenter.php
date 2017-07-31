<?php

namespace App\FrontModule\Presenters;

use App\FrontModule\Components\PartnersBlockControl;
use Aprila\Website\SiteLayout;
use Nittro;

class BasePresenter extends Nittro\Bridges\NittroUI\Presenter
{
	/** @var SiteLayout @inject */
	public $siteLayout;

	/** @var PartnersBlockControl @inject */
	public $partnersBlock;


	public function beforeRender()
	{
		parent::beforeRender();

		$this->template->production = !$this->siteLayout->get('develMode');
		$this->template->version = $this->siteLayout->get('version');
		$this->template->campCapacity = 13;
	}


	public function createComponentPartnersBlock()
	{
		$control = $this->partnersBlock;
		return $control;
	}

}
