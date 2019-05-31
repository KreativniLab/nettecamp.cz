<?php

namespace App\FrontModule\Presenters;

use App\FrontModule\Components\ParticipantsBlockFactory;
use App\FrontModule\Components\PartnersBlockControl;
use App\Model\Model;
use Aprila\Website\SiteLayout;
use Nittro;

class BasePresenter extends Nittro\Bridges\NittroUI\Presenter
{
	/** @var SiteLayout @inject */
	public $siteLayout;

	/** @var PartnersBlockControl @inject */
	public $partnersBlock;

	/** @var ParticipantsBlockFactory @inject */
	public $participantsFactory;

	/** @var Model @inject */
	public $model;

	/** @var string */
	public $title;

	/** @var int */
	public $campCapacity;

	/** @var bool */
	public $disableRegistration;


	protected function startup()
	{
		parent::startup();

		$this->title = 'Nette Camp / 22.—25. srpna 2019';

		$this->setDefaultSnippets([
			'content',
			'navigation'
		]);

		$this->disableRegistration = $this->siteLayout->get('disableRegistration', false);
		$this->campCapacity = $this->siteLayout->get('campCapacity', 50);
	}


	public function beforeRender()
	{
		parent::beforeRender();

		$this->template->production = !$this->siteLayout->get('develMode');
		$this->template->version = $this->siteLayout->get('version');
		$this->template->title = $this->title;
		$this->template->disableRegistration = $this->disableRegistration;
		$this->template->campCapacity = $this->campCapacity;
	}


	public function createComponentPartnersBlock()
	{
		$control = $this->partnersBlock;
		return $control;
	}


	public function createComponentParticipants()
	{
		$control = $this->participantsFactory->create($this->campCapacity, $this->disableRegistration);
		return $control;
	}

}
