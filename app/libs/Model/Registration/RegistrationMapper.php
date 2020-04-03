<?php declare(strict_types = 1);

namespace App\Model;

use Nextras\Orm\Mapper\Dbal\StorageReflection\UnderscoredStorageReflection;
use Nextras\Orm\Mapper\Mapper;

class RegistrationMapper extends Mapper
{

    /** @var string[] */
    private $yesNoValues = [
        true => 'yes',
        false => 'no',
    ];

    protected function createStorageReflection(): UnderscoredStorageReflection
    {
        $reflection = parent::createStorageReflection();
        $reflection->addMapping('invoice', 'invoice', [$this, 'yesNoEntityMapper'], [$this, 'yesNoStorageMapper']);
        $reflection->addMapping('vegetarian', 'vegetarian', [$this, 'yesNoEntityMapper'], [$this, 'yesNoStorageMapper']);
        return $reflection;
    }

    public function yesNoEntityMapper(string $value): bool
    {
        return (bool) array_search($value, $this->yesNoValues);
    }

    public function yesNoStorageMapper(bool $value): string
    {
        return $this->yesNoValues[$value];
    }

}
