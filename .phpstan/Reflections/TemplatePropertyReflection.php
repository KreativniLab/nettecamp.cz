<?php

declare(strict_types = 1);

namespace NetteCamp\PHPStan\Reflections;

use Nette\Bridges\ApplicationLatte\Template;
use PHPStan\Reflection\ClassReflection;
use PHPStan\Reflection\PropertyReflection;
use PHPStan\TrinaryLogic;
use PHPStan\Type\NeverType;
use PHPStan\Type\ObjectType;
use PHPStan\Type\Type;

final class TemplatePropertyReflection implements PropertyReflection
{
	/** @var ClassReflection */
	private $declaringClassReflection;

	public function __construct(ClassReflection $declaringClassReflection)
	{
		$this->declaringClassReflection = $declaringClassReflection;
	}

	public function getDeclaringClass(): ClassReflection
	{
		return $this->declaringClassReflection;
	}

	public function isStatic(): bool
	{
		return false;
	}

	public function isPrivate(): bool
	{
		return true;
	}

	public function isPublic(): bool
	{
		return false;
	}

	public function getDocComment(): ?string
	{
		return null;
	}

	public function getReadableType(): Type
	{
		return new ObjectType(Template::class);
	}

	public function getWritableType(): Type
	{
		return new NeverType(true);
	}

	public function canChangeTypeAfterAssignment(): bool
	{
		return false;
	}

	public function isReadable(): bool
	{
		return true;
	}

	public function isWritable(): bool
	{
		return false;
	}

	public function isDeprecated(): TrinaryLogic
	{
		return TrinaryLogic::createNo();
	}

	public function getDeprecatedDescription(): ?string
	{
		return null;
	}

	public function isInternal(): TrinaryLogic
	{
		return TrinaryLogic::createNo();
	}
}
