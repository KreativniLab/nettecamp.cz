<?php

namespace App\Model;

use Nextras\Orm\Collection\ICollection;
use Nextras\Orm\Repository\Repository;

class RegistrationRepository extends Repository
{
	public static function getEntityClassNames(): array
	{
		return [Registration::class];
	}


	/**
	 * @return ICollection|Registration[]
	 */
	public function findLatest()
	{
		return $this->findBy([
			'year' => date('Y'),
			'deletedAt' => null,
			'status' => Registration::STATUS_REGISTRATION,
		])->orderBy('id', ICollection::DESC);
	}
}
