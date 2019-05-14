<?php

declare(strict_types=1);

/**
 * @copyright   Copyright (c) 2015 ublaboo <ublaboo@paveljanda.com>
 * @author      Pavel Janda <me@paveljanda.com>
 * @package     Ublaboo
 */

namespace Ublaboo\Mailing;

use Nette\Mail\Message;

interface IComposableMail
{

	public function compose(Message $message, ?IMessageData $mailData): void;

	public function send(): void;
}
