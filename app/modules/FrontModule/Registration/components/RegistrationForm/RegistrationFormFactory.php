<?php

namespace App\FrontModule\Components;

interface RegistrationFormFactory
{

	/**
	 * @param bool $fullCamp
	 *
	 * @return RegistrationForm
	 */
	public function create($fullCamp = FALSE);

}
