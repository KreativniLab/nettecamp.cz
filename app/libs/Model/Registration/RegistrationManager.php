<?php
/**
 * @author Honza Cerny (http://honzacerny.com)
 */

namespace App\Model;

use Aprila\Model\Admin\Manager\BaseManager;
use Nette\Database\Context;

class RegistrationManager extends BaseManager
{
	/** @var \Nette\Database\Context */
	protected $database;

	/** @var \App\Model\RegistrationRepository */
	protected $repository;


	function __construct(Context $database, RegistrationRepository $registrationRepository)
	{
		$this->database = $database;
		$this->repository = $registrationRepository;
	}


	public function findAll()
	{
		return parent::findAll()->where('year', 2018)->where('deleted_at', null);
	}


	public function getCampUsers()
	{
		$users = [];
		foreach ($this->findAll()->order('RAND()') as $person) {
			if ($person) {
				if (isset($person->nickname) && $person->nickname != '') {
					$name = $person->nickname;
				} else {
					if (isset($person->name) && $person->name != '') {
						$name = $person->name;
					}
				}
				$users[] = ['name' => $name, 'email' => $person->email];
			}
		}

		return $users;
	}

	public function migrateUsers()
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

				$data = [
					'year' => '2017',
					'name' => $var['name'],
					'nickname' => $var['nickname'],
					'email' => $var['email'],
					'phone' => $var['phone'],
					'arrival' => $var['from'],
					'invoice' => $var['invoice'],
					'vegetarian' => $var['vege'],
					'skills' => $var['level'],
					'tshirt' => $var['tshirt'],
					'note' => $var['note'],
				];

				$this->add($data);

			}
		}

		return $users;
	}


	public function adminGetCampUsers()
	{
		$users = [];
		foreach ($this->findAll() as $person) {
			$users[] = $person;
		}

		return $users;
	}


	public function getCampUsersCount()
	{
		return $this->findAll()->count();
	}

}
