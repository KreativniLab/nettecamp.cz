<?php declare(strict_types = 1);

namespace App\Model;

use DateTimeImmutable;
use Nextras\Orm\Entity\Entity;

/**
 * @property int $id {primary}
 * @property int $year
 * @property string $status {enum self::STATUS_*} {default self::STATUS_REGISTRATION}
 * @property string $name
 * @property string $nickname
 * @property string $email
 * @property string $phone
 * @property string $arrival
 * @property string $invoice
 * @property string $companyId
 * @property string $vegetarian
 * @property string $skills
 * @property string $tshirt
 * @property string $presentation
 * @property string $note
 * @property DateTimeImmutable|null $deletedAt {default null}
 */
class Registration extends Entity
{

    public const STATUS_REGISTRATION = 'registration';
    public const STATUS_WAITINGLIST = 'waitinglist';
    public const STATUS_STORNO = 'storno';
    public const STATUS_PAYED = 'payed';

    public function __construct(int $year, string $name, string $nickname, string $email, string $phone, string $arrival, string $invoice, string $companyId, string $vegetarian, string $skills, string $tshirt, string $presentation, string $note)
    {
        parent::__construct();

        $this->year = $year;
        $this->name = $name;
        $this->nickname = $nickname;
        $this->email = $email;
        $this->phone = $phone;
        $this->arrival = $arrival;
        $this->invoice = $invoice;
        $this->vegetarian = $vegetarian;
        $this->skills = $skills;
        $this->tshirt = $tshirt;
        $this->presentation = $presentation;
        $this->note = $note;
        $this->companyId = $companyId;
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
