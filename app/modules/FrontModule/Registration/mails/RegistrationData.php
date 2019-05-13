<?php
/**
 * @author Honza Cerny (http://honzacerny.com)
 */

namespace App\FrontModule\Mails;

use Ublaboo\Mailing\IMessageData;

class RegistrationData implements IMessageData
{
	public $year;
	public $name;
	public $nickname;
	public $email;
	public $phone;
	public $arrival;
	public $invoice;
	public $vegetarian;
	public $skills;
	public $tshirt;
	public $presentation;
	public $note;


	/**
	 * RegistrationDTO constructor.
	 *
	 * @param $year
	 * @param $name
	 * @param $nickname
	 * @param $email
	 * @param $phone
	 * @param $arrival
	 * @param $invoice
	 * @param $vegetarian
	 * @param $skills
	 * @param $tshirt
	 * @param $presentation
	 * @param $note
	 */
	public function __construct($year, $name, $nickname, $email, $phone, $arrival, $invoice, $vegetarian, $skills, $tshirt, $presentation, $note)
	{
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
	}

}
