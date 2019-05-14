<?php

declare(strict_types=1);

/**
 * @copyright   Copyright (c) 2015 ublaboo <ublaboo@paveljanda.com>
 * @author      Pavel Janda <me@paveljanda.com>
 * @package     Ublaboo
 */

namespace Ublaboo\Mailing\DI;

use Nette\DI\CompilerExtension;
use Nette\DI\Helpers;
use Ublaboo\Mailing\MailFactory;
use Ublaboo\Mailing\MailLogger;

class MailingExtension extends CompilerExtension
{

	public const CONFIG_LOG  = 'log';
	public const CONFIG_SEND = 'send';
	public const CONFIG_BOTH = 'both';

	/**
	 * @var array
	 */
	private $defaults = [
		'do' => self::CONFIG_BOTH,
		'logDirectory' => '%appDir%/../log/mails',
		'mailImagesBasePath' => '%wwwDir%',
		'mails' => [],
	];


	public function loadConfiguration(): void
	{
		$config = $this->expandConfigParams();

		$builder = $this->getContainerBuilder();

		$builder->addDefinition($this->prefix('mailLogger'))
			->setClass(MailLogger::class)
			->setArguments([$config['logDirectory']]);

		$builder->addDefinition($this->prefix('mailFactory'))
			->setClass(MailFactory::class)
			->setArguments([$config['do'], $config['mailImagesBasePath'], $config['mails']]);
	}


	private function expandConfigParams(): array
	{
		$config = $this->validateConfig($this->defaults, $this->config);

		$config['logDirectory'] = Helpers::expand(
			$config['logDirectory'],
			$this->getContainerBuilder()->parameters
		);

		$config['mailImagesBasePath'] = Helpers::expand(
			$config['mailImagesBasePath'],
			$this->getContainerBuilder()->parameters
		);

		return $config;
	}
}
