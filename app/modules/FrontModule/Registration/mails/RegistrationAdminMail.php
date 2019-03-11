<?php

namespace App\FrontModule\Mails;

use Nette;
use Ublaboo\Mailing\Mail;
use Ublaboo\Mailing\IComposableMail;

class RegistrationAdminMail extends Mail implements IComposableMail
{
	protected $mails;


	public function compose(Nette\Mail\Message $message, $params = NULL)
	{
		$message->setFrom($this->mails['default_sender']);
		$message->addReplyTo($params['email'], $params['name']);
		$message->addTo($this->mails['default_recipient']);
		$message->addCc($this->mails['copy_recipient']);
	}

}
