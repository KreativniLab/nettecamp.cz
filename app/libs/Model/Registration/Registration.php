<?php declare(strict_types = 1);

namespace App\Model;

use DateTimeImmutable;
use Nextras\Orm\Entity\Entity;
use Ublaboo\Mailing\IMessageData;

/**
 * @property int $id {primary}
 * @property int $year
 * @property string $status {enum self::STATUS_*} {default self::STATUS_REGISTRATION}
 * @property string $name
 * @property string $nickname
 * @property string $email
 * @property string $phone
 * @property string $arrival
 * @property mixed $invoice
 * @property string $companyId
 * @property mixed $vegetarian
 * @property string $skills
 * @property string $tshirt
 * @property string $presentation
 * @property string $note
 * @property DateTimeImmutable|null $deletedAt {default null}
 *
 * @property string $liame {virtual}
 */
class Registration extends Entity implements IMessageData
{

    public const STATUS_REGISTRATION = 'registration';
    public const STATUS_WAITINGLIST = 'waitinglist';
    public const STATUS_STORNO = 'storno';
    public const STATUS_PAYED = 'payed';

    public function __construct()
    {
        parent::__construct();
        $this->year = (int) date('Y');
    }

    public function setterLiame(string $value): void
    {
        $this->email = $value;
    }

    public function getterLiame(): string
    {
        return $this->email;
    }

    public function setInWaitinglist(): void
    {
        $this->status = self::STATUS_WAITINGLIST;
    }


    public function getNick(): string
    {
        return $this->nickname !== '' ? $this->nickname : $this->name;
    }

}
