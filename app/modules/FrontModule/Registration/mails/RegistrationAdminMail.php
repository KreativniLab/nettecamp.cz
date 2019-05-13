<?php

declare(strict_types=1);

namespace App\FrontModule\Mails;

use Nette;
use Ublaboo\Mailing\AbstractMail;
use Ublaboo\Mailing\IComposableMail;
use Ublaboo\Mailing\IMessageData;

final class RegistrationAdminMail extends AbstractMail implements IComposableMail
{
	protected $mails;

	public function compose(Nette\Mail\Message $message, ?IMessageData $mailData): void
	{
		$message->setFrom($this->mailAddresses['default_sender']);
		$message->addReplyTo($mailData->email, $mailData->name);
		$message->addTo($this->mailAddresses['default_recipient']);
		$message->addCc($this->mailAddresses['copy_recipient']);
	}

}
