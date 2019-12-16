<?php
/**
 * @author Honza Cerny (http://honzacerny.com)
 */

declare(strict_types=1);

namespace App\FrontModule\Mails;

use Ublaboo\Mailing\IMessageData;

class RegistrationData implements IMessageData
{
	/** @var int */
	public $year;
	/** @var string */
	public $name;
	/** @var string */
	public $nickname;
	/** @var string */
	public $email;
	/** @var string */
	public $phone;
	/** @var string */
	public $arrival;
	/** @var string */
	public $invoice;
	/** @var string */
	public $companyId;
	/** @var string */
	public $vegetarian;
	/** @var string */
	public $skills;
	/** @var string */
	public $tshirt;
	/** @var string */
	public $presentation;
	/** @var string */
	public $note;

	public function __construct(
		int $year,
		string $name,
		string $nickname,
		string $email,
		string $phone,
		string $arrival,
		string $invoice,
		string $companyId,
		string $vegetarian,
		string $skills,
		string $tshirt,
		string $presentation,
		string $note
	) {
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

}
