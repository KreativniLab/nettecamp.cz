<?php

namespace App\Model;

use Nextras\Orm\Entity\Entity;

/**
 * @property int $id {primary}
 * @property int $year
 * @property string $name
 * @property string $location
 * @property int $attendance
 * @property string $linkForum
 * @property string $linkFacebook

 */
class History extends Entity
{

	public function __construct(
		int $year,
		string $name
	) {
		parent::__construct();

		$this->year = $year;
		$this->name = $name;
	}

}
