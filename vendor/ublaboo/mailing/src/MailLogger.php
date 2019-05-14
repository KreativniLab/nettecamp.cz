<?php

declare(strict_types=1);

/**
 * @copyright   Copyright (c) 2015 ublaboo <ublaboo@paveljanda.com>
 * @author      Pavel Janda <me@paveljanda.com>
 * @package     Ublaboo
 */

namespace Ublaboo\Mailing;

use Nette\Mail\Message;

class MailLogger implements ILogger
{

	private const LOG_EXTENSION = '.eml';

	/**
	 * @var string
	 */
	protected $logDirectory;


	public function __construct($logDirectory)
	{
		$this->logDirectory = $logDirectory;
	}


	/**
	 * Log mail messages to eml file
	 */
	public function log($type, Message $mail): void
	{
		$timestamp = date('Y-m-d H:i:s');
		$type .= '.' . time();
		$file = $this->getLogFile($type, $timestamp);

		if (file_exists($file) && filesize($file)) {
			$file = str_replace(
				static::LOG_EXTENSION,
				'.' . uniqid() . static::LOG_EXTENSION,
				$file
			);
		}

		file_put_contents($file, $mail->generateMessage());
	}


	/**
	 * If not already created, create a directory path that sticks to the standard described above
	 */
	public function getLogFile(string $type, string $timestamp): string
	{
		preg_match('/^((([0-9]{4})-[0-9]{2})-[0-9]{2}).*/', $timestamp, $fragments);

		$yearDir = $this->logDirectory . '/' . $fragments[3];
		$monthDir = $yearDir . '/' . $fragments[2];
		$dayDir = $monthDir . '/' . $fragments[1];
		$file = $dayDir . '/' . $type . static::LOG_EXTENSION;

		if (!file_exists($dayDir)) {
			mkdir($dayDir, 0777, true);
		}

		if (!file_exists($file)) {
			touch($file);
		}

		return $file;
	}
}
