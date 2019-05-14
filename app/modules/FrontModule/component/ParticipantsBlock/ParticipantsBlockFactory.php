<?php
/**
 * @author Honza Cerny (http://honzacerny.com)
 */

namespace App\FrontModule\Components;

interface ParticipantsBlockFactory
{
	public function create(int $capacity, bool $disabled): ParticipantsBlockControl;

}
