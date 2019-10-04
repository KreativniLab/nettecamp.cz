<?php
/**
 * @author Honza Cerny (http://honzacerny.com)
 */

declare(strict_types=1);

namespace App\FrontModule\Components;

use App\Model\Model;
use Nette\Application\UI\Control;

class ParticipantsBlockControl extends Control
{
	/** @var Model @inject */
	public $model;

	/** @var int */
	private $capacity;

	/** @var bool */
	private $disabled;


	public function __construct(int $capacity, bool $disabled, Model $model)
	{
		$this->capacity = $capacity;
		$this->disabled = $disabled;
		$this->model = $model;
	}


	function render()
	{
		$participants = $this->model->registrations->findLatest();

		$participantsArray = $participants->fetchAll();
		shuffle($participantsArray);

		$this->template->participants = $participantsArray;
		$this->template->count = $participants->count();
		$this->template->campCapacity = $this->capacity;
		$this->template->disableRegistration = $this->disabled;

		$this->template->render(__DIR__ . '/participantsBlock.latte');
	}
}
