<?php


use Nette\Database\Context;

class MailManager extends \Nette\Object
{

	/**
	 * @var array
	 *
	 * [from] info@domain.ltd
	 * [name] Info Domain
	 */
	protected $baseEmailAddress;

	/**
	 * @var \Nette\Database\Context
	 */
	protected $database;

	/**
	 * @var Nette\Mail\IMailer
	 */
	protected $mailer;


	private $debugEmail = FALSE;


	function __construct($baseEmailAddress = [], Nette\Mail\IMailer $mailer, Context $database, $debugEmail = FALSE)
	{
		$this->mailer = $mailer;
		$this->baseEmailAddress = $baseEmailAddress;
		$this->database = $database;
		$this->debugEmail = $debugEmail;
	}


	public function sendOrderEmail($variables,
								   $language = 'cs',
								   \Nette\Application\UI\ITemplate $template)
	{
		$email = $variables->email;
		$name = $variables->name;

		// set variables
		$template->variables = $variables;
		$template->language = $language;

		$templateAdmin = clone $template;

		// Customer email
		$template->setFile(__DIR__ . '/email/order.' . $language . '.latte');

		$mail = new Nette\Mail\Message;
		$mail->setFrom($this->baseEmailAddress['from'], $this->baseEmailAddress['name']);


		if ($this->debugEmail) {
			$mail->addTo($this->debugEmail, 'Debug version');
		} else {
			$mail->addTo($email, $name);
		}
		$mail->setHtmlBody($template);


		// Admin email
		$templateAdmin->setFile(__DIR__ . '/email/order.admin.latte');

		$mailAdmin = new Nette\Mail\Message;
		$mailAdmin->setFrom('info@nettecamp.cz', 'NetteCamp');



		if ($this->debugEmail) {
			$mailAdmin->addTo($this->debugEmail, 'Debug version');
		} else {
			$mailAdmin->addTo('info@kreativnilaborator.cz', 'Kreativni Laborator');
		}
		$mailAdmin->addReplyTo($email, $name);

		$mailAdmin->setHtmlBody($templateAdmin);


		// save email
		$this->addEmail($email,
			'info@nettecamp.cz',
			'Registration Nette Camp',
			$templateAdmin,
			$variables);


		try {
			$this->mailer->send($mail);
			$this->mailer->send($mailAdmin);

			return TRUE;
		} catch (Exception $e) {

			return FALSE;
		}

	}

	/********************* email storage *********************/

	/**
	 * @return Nette\Database\Table\Selection
	 */
	public function table()
	{
		return $this->database->table('emails');
	}

	/********************* find* methods & get *********************/

	/**
	 * @param int $id
	 * @return Nette\Database\Table\IRow
	 */
	public function get($id)
	{
		return $this->table()->get($id);
	}


	/**
	 * @return int
	 */
	public function getCount()
	{
		return $this->table()->count();
	}


	/**
	 * @return Nette\Database\Table\Selection
	 */
	public function findAll()
	{
		return $this->table();
	}


	/**
	 * @param $query
	 * @return \Nette\Database\Table\Selection
	 */
	public function findFulltext($query)
	{
		return $this->table()
			->where('to LIKE ? OR subject LIKE ? OR body LIKE ?',
				array(
					"%" . $query . "%",
					"%" . $query . "%",
					"%" . $query . "%")
			);
	}


	/********************* update* methods *********************/


	public function addEmail($from = '', $to = '', $subject = '', $body = '', $variables)
	{

		$data = array(
			'created_date' => new DateTime(),
			'from' => $from,
			'to' => $to,
			'subject' => $subject,
			'body' => $body,
			'variables' => serialize($variables),
		);

		$newRow = $this->table()->insert($data);

		return $newRow;
	}

}