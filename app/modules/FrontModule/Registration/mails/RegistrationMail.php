<?php

namespace App\FrontModule\Mails;

use Nette;
use Ublaboo\Mailing\AbstractMail;
use Ublaboo\Mailing\IComposableMail;
use Ublaboo\Mailing\IMessageData;

class RegistrationMail extends AbstractMail implements IComposableMail
{
	public function compose(Nette\Mail\Message $message, ?IMessageData $mailData): void
	{
		$message->setFrom($this->mailAddresses['default_sender']);
		$message->addReplyTo($this->mailAddresses['default_recipient']);
		$message->addTo($mailData->email);
	}

}
