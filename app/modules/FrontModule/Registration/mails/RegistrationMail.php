<?php

namespace App\FrontModule\Mails;

use Nette;
use Ublaboo\Mailing\Mail;
use Ublaboo\Mailing\IComposableMail;

class RegistrationMail extends Mail implements IComposableMail
{
	protected $mails;


	public function compose(Nette\Mail\Message $message, $params = NULL)
	{
		$message->setFrom($this->mails['default_sender']);
		$message->addTo($params['email']);
	}

}