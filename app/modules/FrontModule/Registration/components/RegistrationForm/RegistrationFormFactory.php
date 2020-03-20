<?php declare(strict_types = 1);

namespace App\FrontModule\Components;

interface RegistrationFormFactory
{

    public function create(bool $fullCamp = false): RegistrationForm;

}
