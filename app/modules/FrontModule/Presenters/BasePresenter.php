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

	/** @var int */
	public $campCapacity = 0;

	/** @var string */
	public $title;


	protected function startup()
	{
		parent::startup();
		$this->campCapacity = 40;

		$this->title = 'Nette Camp / 24.–27. srpna 2017';

		$this->setDefaultSnippets([
			'content',
			'title',
		]);
	}


	public function beforeRender()
	{
		parent::beforeRender();

		$this->template->production = !$this->siteLayout->get('develMode');
		$this->template->version = $this->siteLayout->get('version');
		$this->template->campCapacity = $this->campCapacity;
		$this->template->title = $this->title;
		$this->template->disableRegistration = $this->siteLayout->get('disableRegistration', false);
	}


	public function createComponentPartnersBlock()
	{
		$control = $this->partnersBlock;
		return $control;
	}

}
