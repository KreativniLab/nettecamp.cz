<?php
/**
 * @author Honza Cerny (http://honzacerny.com)
 */

namespace App\FrontModule\Components;

use Nette\Utils\ArrayHash;

class PartnersBlockControl extends \Nette\Application\UI\Control
{
	/** @var array */
	private $partners = [];

	/** @var bool */
	private $isEmpty = FALSE;


	public function __construct($partners = [])
	{
		$this->partners = $partners;
		foreach ($this->partners as $partner) {
			if (isset($partner['empty'])){
				$this->isEmpty = TRUE;
			}
		}

	}


	function render()
	{
		$this->template->empty = $this->isEmpty;
		$this->template->partners = ArrayHash::from($this->partners);
		$this->template->render(__DIR__ . '/partnersBlock.latte');
	}
}
