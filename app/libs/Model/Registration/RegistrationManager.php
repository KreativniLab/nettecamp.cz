<?php
use Nette\Database\Context;

class RegistrationManager
{
	use Nette\SmartObject;

	/** @var \Nette\Database\Context */
	protected $database;


	function __construct(Context $database)
	{
		$this->database = $database;
	}


	public function getCampUsers()
	{
		$users = [];
		$variables = $this->database->query("SELECT variables FROM emails WHERE subject = 'Registration Nette Camp' AND (YEAR(created_date) != 2015 AND YEAR(created_date) != 2016)")->fetchAll();
		foreach ($variables as $variable) {
			$var = @unserialize($variable->variables);
			if ($var) {
				if (isset($var->nickname) && $var->nickname != '') {
					$name = $var->nickname;
				} else {
					if (isset($var->name) && $var->name != '') {
						$name = $var->name;
					}
				}
				$users[] = ['name' => $name, 'email' => $var->email];
			}
		}

		return $users;
	}


	public function adminGetCampUsers()
	{
		$users = [];
		$variables = $this->database->query("SELECT variables FROM emails WHERE subject = 'Registration Nette Camp' AND (YEAR(created_date) != 2015 AND YEAR(created_date) != 2016)")->fetchAll();
		foreach ($variables as $variable) {
			$var = unserialize($variable->variables);
			$users[] = $var;
		}

		return $users;
	}


	public function getCampUsersCount()
	{
		return $this->database->query("SELECT count(id) AS cnt FROM emails WHERE subject = 'Registration Nette Camp' AND (YEAR(created_date) != 2015 AND YEAR(created_date) != 2016 )")->fetchField('cnt');
	}

}
