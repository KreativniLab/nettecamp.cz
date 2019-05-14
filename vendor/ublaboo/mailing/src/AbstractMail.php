<?php

declare(strict_types=1);

/**
 * @copyright   Copyright (c) 2015 ublaboo <ublaboo@paveljanda.com>
 * @author      Pavel Janda <me@paveljanda.com>
 * @package     Ublaboo
 */

namespace Ublaboo\Mailing;

use Latte\Engine;
use Nette\Application\LinkGenerator;
use Nette\Application\UI\ITemplate;
use Nette\Application\UI\ITemplateFactory;
use Nette\Bridges\ApplicationLatte\Template;
use Nette\Mail\IMailer;
use Nette\Mail\Message;
use Ublaboo\Mailing\DI\MailingExtension;

abstract class AbstractMail
{

	/**
	 * @var array
	 */
	protected $mailAddresses;

	/**
	 * @var IMailer
	 */
	protected $mailer;

	/**
	 * @var Message
	 */
	protected $message;

	/**
	 * @var LinkGenerator
	 */
	protected $linkGenerator;

	/**
	 * @var ILogger
	 */
	protected $logger;

	/**
	 * @var ITemplate
	 */
	protected $template;

	/**
	 * @var string
	 */
	protected $mailImagesBasePath;

	/**
	 * @var string
	 */
	private $config;

	/**
	 * @var IMessageData|null
	 */
	private $mailData;


	public function __construct(
		string $config,
		array $mailAddresses,
		IMailer $mailer,
		Message $message,
		LinkGenerator $linkGenerator,
		ITemplateFactory $templateFactory,
		ILogger $logger,
		?IMessageData $mailData
	) {
		$this->config = $config;
		$this->mailAddresses = $mailAddresses;
		$this->mailer = $mailer;
		$this->message = $message;
		$this->linkGenerator = $linkGenerator;
		$this->logger = $logger;
		$this->mailData = $mailData;

		$this->template = $templateFactory->createTemplate();

		/**
		 * Initiate mail composing
		 */
		if ($this instanceof IComposableMail) {
			$this->compose($this->message, $this->mailData);
		}
	}


	public function setBasePath(string $mailImagesBasePath): void
	{
		$this->mailImagesBasePath = $mailImagesBasePath;
	}

	
	/**
	 * Render latte template to string and send (and/or log) mail
	 */
	public function send(): void
	{
		/**
		 * Template variables..
		 */
		$this->template->mailData = $this->mailData;

		/**
		 * Stick to convention that Email:
		 * 		/FooMail.php	
		 * 
		 * will have template with path of:
		 * 		/templates/FooMail.latte
		 */
		$mailClassReflection = new \ReflectionClass($this);
		$templateName = $mailClassReflection->getShortName();

		$this->template->setFile(sprintf(
			'%s/templates/%s.latte',
			dirname($mailClassReflection->getFilename()),
			$templateName
		));

		/**
		 * Set body/html body
		 */
		if (version_compare(Engine::VERSION, '2.4.0', '>=')) {
			$this->template->getLatte()->addProvider('uiControl', $this->linkGenerator);
		} else {
			$this->template->_control = $this->linkGenerator;
		}

		$this->message->setHtmlBody((string) $this->template, $this->mailImagesBasePath);

		/**
		 * In case mail sending in on, send message
		 */
		if ($this->config === MailingExtension::CONFIG_BOTH || $this->config === MailingExtension::CONFIG_SEND) {
			$this->mailer->send($this->message);
		}

		/**
		 * In case mail logging is turned on, log message
		 */
		if ($this->config === MailingExtension::CONFIG_LOG || $this->config === MailingExtension::CONFIG_BOTH) {
			$this->logger->log($templateName, $this->message);
		}
	}
}
