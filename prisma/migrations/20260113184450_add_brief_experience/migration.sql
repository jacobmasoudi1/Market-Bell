-- CreateEnum
CREATE TYPE "BriefStyle" AS ENUM ('bullet', 'narrative', 'numbers_first');

-- CreateEnum
CREATE TYPE "Experience" AS ENUM ('beginner', 'intermediate', 'advanced');

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "briefStyle" "BriefStyle" NOT NULL DEFAULT 'bullet',
ADD COLUMN     "experience" "Experience" NOT NULL DEFAULT 'intermediate';
