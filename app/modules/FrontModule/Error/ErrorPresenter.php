<?php

declare(strict_types=1);

namespace App\Presenters;

use Nette;
use Tracy\ILogger;


class ErrorPresenter extends Nette\Application\UI\Presenter
{
	/** @var ILogger */
	private $logger;


	public function __construct(ILogger $logger)
	{
        parent::__construct();

		$this->logger = $logger;
	}


	public function renderDefault(\Exception $exception): void
	{
		if ($exception instanceof Nette\Application\BadRequestException) {
			$code = $exception->getCode();
			$this->setView(in_array($code, [403, 404, 405, 410, 500]) ? $code : '4xx');

		} else {
			$this->setView('500');
			$this->logger->log($exception, ILogger::EXCEPTION);
		}

		if ($this->isAjax()) {
			$this->payload->error = TRUE;
			$this->terminate();
		}
	}

}
