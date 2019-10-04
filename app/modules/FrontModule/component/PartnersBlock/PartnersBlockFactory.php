<?php
/**
 * @author Honza Cerny (http://honzacerny.com)
 */

declare(strict_types=1);

namespace App\FrontModule\Components;

interface PartnersBlockFactory
{

	/**
	 * @return PartnersBlockControl
	 */
	public function create();

}
