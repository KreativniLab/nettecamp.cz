<?php

declare(strict_types=1);

/**
 * @copyright   Copyright (c) 2015 ublaboo <ublaboo@paveljanda.com>
 * @author      Pavel Janda <me@paveljanda.com>
 * @package     Ublaboo
 */

namespace Ublaboo\Mailing;

use Nette\Application\LinkGenerator;
use Nette\Application\UI\ITemplateFactory;
use Nette\Mail\IMailer;
use Nette\Mail\Message;
use Ublaboo\Mailing\Exception\MailingMailCreationException;

class MailFactory
{

	/**
	 * @var string
	 */
	private $config;

	/**
	 * @var IMailer
	 */
	private $mailer;

	/**
	 * @var Message
	 */
	private $message;

	/**
	 * @var array
	 */
	private $mails;

	/**
	 * @var ITemplateFactory
	 */
	private $templateFactory;

	/**
	 * @var LinkGenerator
	 */
	private $linkGenerator;

	/**
	 * @var ILogger
	 */
	private $logger;

	/**
	 * @var string
	 */
	private $mailImagesBasePath;


	public function __construct(
		string $config,
		string $mailImagesBasePath,
		array $mails,
		IMailer $mailer,
		LinkGenerator $linkGenerator,
		ITemplateFactory $templateFactory,
		ILogger $logger
	) {
		$this->config = $config;
		$this->mailImagesBasePath = $mailImagesBasePath;
		$this->mailer = $mailer;
		$this->mails = $mails;
		$this->linkGenerator = $linkGenerator;
		$this->templateFactory = $templateFactory;
		$this->logger = $logger;
	}


	public function createByType(string $type, ?IMessageData $mailData): IComposableMail
	{
		$this->message = new Message;

		if (class_exists($type)) {
			$mail = new $type(
				$this->config,
				$this->mails,
				$this->mailer,
				$this->message,
				$this->linkGenerator,
				$this->templateFactory,
				$this->logger,
				$mailData
			);

			$mail->setBasePath($this->mailImagesBasePath);

			if (!$mail instanceof IComposableMail) {
				throw new MailingMailCreationException(
					sprintf(
						'Email of type %s does not implement %s',
						$type,
						IComposableMail::class
					)
				);
			}

			return $mail;
		}

		throw new MailingMailCreationException(sprintf('Email of type %s does not exist', $type));
	}
}
