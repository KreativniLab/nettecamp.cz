<?php
/**
 * @author Honza Cerny (http://honzacerny.com)
 */

declare(strict_types=1);

namespace App\FrontModule\Components;

interface ParticipantsBlockFactory
{
	public function create(int $capacity, bool $disabled): ParticipantsBlockControl;

}
