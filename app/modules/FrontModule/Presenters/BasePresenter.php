<?php

namespace App\FrontModule\Presenters;

use Aprila\Website\SiteLayout;
use Nittro;

class BasePresenter extends Nittro\Bridges\NittroUI\Presenter
{
	/** @var SiteLayout @inject */
	public $siteLayout;


	public function beforeRender()
	{
		parent::beforeRender();

		$this->template->production = !$this->siteLayout->get('develMode');
		$this->template->version = $this->siteLayout->get('version');
	}

}
